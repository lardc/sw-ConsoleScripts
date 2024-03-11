include("CalGeneral.js")
include("TestCS.js")
include("PrintStatus.js")
include("Tektronix.js")

// Results storage
ccs_inp = [];
ccs_unit = [];
ccs_scope = [];

// Relative error
ccs_measure_err = [];
ccs_setpoint_err = [];

// Counter
ccs_counter = 0;

// Temperature settings
ccs_t_min = 50;
ccs_t_max = 200;
ccs_t_stp = 5;

// TRM Address
TRM_Addr1 = 1;
TRM_Addr2 = 2;

// Temperature calibration
ccs_tempdac_set1 = [];
ccs_tempdac_set2 = [];
ccs_tempdac_ch1 = [];
ccs_tempdac_ch2 = [];
ccs_tempdac_err1 = [];
ccs_tempdac_err2 = [];
ccs_tempread_err1 = [];
ccs_tempread_err2 = [];

//Clamping calibration
force_min = 5;
force_max = 95;
force_step = 5;
PortNumberTerminal = 7;

mode_force = 'q';			// 'a' for an automatic force value input mode, 's' - for a semi-automatic mode
mode_terminal = 'q';		// 'a' for an automatic mode, 's' - for a semi-automatic mode
 
function CCS_ADCOffsetCalibrate()
{
	var num = 50;
	var offset, sum = 0;
	print("Collecting data...");
	
	for (var i = 0; i < num; i++)
	{
		dev.c(122);
		sum += dev.r(115);
		sleep(200);
	}
	
	offset = Math.round(sum / num);
	dev.w(0, offset);
	
	print("Loaded offset value: " + offset);
}


function CCS_ClampCalibrate()
{
	ccs_counter = 0;
	CCS_ClampResetA();
	CCS_ClampCal(0, 1, 0);

	
	if (CCS_ClampCollectAutomatic())
	{
		if (ccs_counter == 0)
		{
			print("Empty input, exit.");
			return;
		}
		
		print("Apply correction? (press 'y' or 'n')");
		do
		{
			key = readkey();
			if (key == "y")
				break;
			else if (key == "n")
				return;
		}
		while (true)
		
		CCS_SaveClamp("cs_clamp");
		
		// Plot relative error distribution
		scattern(ccs_scope, ccs_measure_err, "Force scope (in N)", "Error (in %)", "Force measure relative error");
		scattern(ccs_inp, ccs_setpoint_err, "Force input (in N)", "Error (in %)", "Force setpoint relative error");
		
		// Calculate correction
		var ccs_corr = CGEN_GetCorrection2("cs_clamp");
		CCS_ClampCal(ccs_corr[0], ccs_corr[1], ccs_corr[2]);
		
		// Print correction
		CCS_PrintClampCal();
	}

}

function CCS_ClampVerify()
{
	ccs_counter = 0;
	CCS_ClampResetA();
	if (CCS_ClampCollectAutomatic())
	{
		if (ccs_counter == 0)
		{
			print("Empty input, exit.");
			return;
		}
		
		// Plot relative error distribution

		scattern(ccs_scope, ccs_measure_err, "Force scope (in N)", "Error (in %)", "Force measure relative error");
		scattern(ccs_inp, ccs_setpoint_err, "Force input (in N)", "Error (in %)", "Force setpoint relative error");
	}
}



function CCS_ClampCollectAutomatic()
{
	var temp_force = mode_force;
	var temp_terminal = mode_terminal;
	if((mode_force != 'a') && (mode_force != 's'))
	{
		print("If you prefer an automatic input force values enter 'a' If you prefer input this manually, enter 's':");
		mode_force = readkey();
		if((mode_force != 'a') && (mode_force != 's'))
		{
			print("Incorrect input");
			return false;
		}
		
	}
	if((mode_terminal != 'a') && (mode_terminal != 's'))
	{
		print("If you prefer an automatic input data from the weight indicator enter 'a'. If you prefer manual input the data enter 's':");
		mode_terminal = readkey();
		if((mode_terminal != 'a') && (mode_terminal != 's'))
		{
			print("Incorrect input");
			return false;
		}
	}
	
	if(mode_terminal == 'a')
	{
		TEK_PortInit(PortNumberTerminal, 9600);
		re = new RegExp("[0-9]+");
	}
	var force_in = CGEN_GetRange(force_min, force_max, force_step);
	var force_input, force_unit, force_scope;
	print("----------------------------------")
	print("Press 'Enter' with empty line to skip.");
	print("----------------------------------")

	
	for(var i = 0; ; i++)
	{
		print("# " + (ccs_counter + 1));
		if(mode_force == 'a')
		{
			if(i == force_in.length)
				break;
			force_input = Math.round(parseFloat(force_in[i]) * 1000);
		}
		else if (mode_force == 's')
		{
			print("Enter force value (in kN):");
			force_input = Math.round(parseFloat(readline()) * 1000);
		}
		
		if (isNaN(force_input))
			break;

		dev.w(70, Math.round(force_input / 100));
		
		// Start clamping
		print("Clamping.")
		while (dev.r(96) == 10) sleep(50);
		dev.c(102);
		while (dev.r(96) == 7) 
		{
			if(anykey())
			{
				mode_force = temp_force;
				mode_terminal = temp_terminal;
				dev.c(105);
				sleep(50);
				print("Abort");
				dev.c(100);
				while(dev.r(96) == 5)
					sleep(50);
				return false;
			}
			sleep(50);
		}
		
		// Handle clamping error
		if (dev.r(96) != 8)
		{
			print("Clamping error, exit.");
			mode_force = temp_force;
			mode_terminal = temp_terminal;
			return false;
		}
		
		sleep(2000);
		pl(dev.rafs(1));
		force_unit = dev.r(110) * 100;
		if(mode_terminal == 'a')
			force_scope = (parseInt(re.exec(TEK_Exec('')).join(""),10));
		else if (mode_terminal == 's')
		{
			print("Enter force value from the weight indicator (in kg):");
			force_scope = parseFloat(readline());
		}
		force_scope = Math.round(force_scope * 9.8);
		
		if (isNaN(force_scope))
			break;
		
		print("\nForce setting (in N):\t\t\t\t" + force_input);
		print("Force value from the weight indicator (in N):\t" + force_scope);
		print("Force value from the unit (in N):\t\t" + force_unit);
		print("----------------------------------")
		
		// Handle unclamping
		var cs_state = dev.r(96);
		if (cs_state == 8)
			dev.c(104);
		else if (cs_state != 3 && cs_state != 10)
		{
			print("Unclamping error, exit.");
			mode_force = temp_force;
			mode_terminal = temp_terminal;
			return false;
		}
		
		ccs_inp[ccs_counter] = force_input;
		ccs_unit[ccs_counter] = force_unit;
		ccs_scope[ccs_counter] = force_scope;
		ccs_measure_err[ccs_counter] = ((force_scope - force_unit) / force_unit * 100).toFixed(1);
		ccs_setpoint_err[ccs_counter] = ((force_input - force_scope) / force_scope * 100).toFixed(1);
		ccs_counter++;
		if(anykey())
		{
			mode_force = temp_force;
			mode_terminal = temp_terminal;
			dev.c(105);
			print("Abort");
			dev.c(100);
			while(dev.r(96) == 5)
					sleep(50);
			return false;
		}
	}
	if(mode_terminal == 'a')
		delete(re);
	mode_force = temp_force;
	mode_terminal = temp_terminal;
	return true;
}

function CCS_TempReadCalibrate(TRM_AddrArray)
{
	for (i = 0; i < TRM_AddrArray.length; i++)
	{
		switch (TRM_AddrArray[i])
		{
			case TRM_Addr1:
				CCS_TempReadCal1(0, 1, 0);
				print("TRM1 coefficients were reseted.");
				print("-----");
				break;
			
			case TRM_Addr2:
				CCS_TempReadCal2(0, 1, 0);
				print("TRM2 coefficients were reseted.");
				print("-----");
				break;
		}
	}
	
	// Turn off heating
	dev.w(72, 250);
	dev.c(108);
	
	CS_Temp(10000);
	
	for (i = 0; i < TRM_AddrArray.length; i++)
	{
		switch (TRM_AddrArray[i])
		{
			case TRM_Addr1:
				// Calculate error
				for (var j = 0; j < cs_time.length; j++)
					ccs_tempread_err1[j] = (cs_t_remote1[j] - cs_t_remote_ext[j]).toFixed(1);
				
				// Plot error
				scattern(cs_t_remote_ext, ccs_tempread_err1, "Temp (in C)", "Error (C)", "Temperature TRM1 absolute error");
				
				// Save data
				CCS_SaveTempRead1("cs_temp_read1");
				
				// Calculate correction
				var ccs_corr1 = CGEN_GetCorrection2("cs_temp_read1");
				CCS_TempReadCal1(ccs_corr1[0], ccs_corr1[1], ccs_corr1[2]);
				
				// Plot and save fixed error
				CCS_PlotAndSaveFixedError("cs_temp_read1_fixed", cs_t_remote1, cs_t_remote_ext, ccs_corr1, TRM_Addr1);
				
				// Print correction
				CCS_PrintTempReadCal1();
				break;
			
			case TRM_Addr2:
				// Calculate error
				for (var j = 0; j < cs_time.length; j++)
					ccs_tempread_err2[j] = (cs_t_remote2[j] - cs_t_remote_ext[j]).toFixed(1);
				
				// Plot error
				scattern(cs_t_remote_ext, ccs_tempread_err2, "Temp (in C)", "Error (C)", "Temperature TRM2 absolute error");
				
				// Save data
				CCS_SaveTempRead2("cs_temp_read2");
				
				// Calculate correction
				var ccs_corr2 = CGEN_GetCorrection2("cs_temp_read2");
				CCS_TempReadCal2(ccs_corr2[0], ccs_corr2[1], ccs_corr2[2]);
				
				// Plot and save fixed error
				CCS_PlotAndSaveFixedError("cs_temp_read2_fixed", cs_t_remote2, cs_t_remote_ext, ccs_corr2, TRM_Addr2);
				
				// Print correction
				CCS_PrintTempReadCal2();
				break;
		}		
	}
}

function CCS_SaveClamp(Name)
{
	CGEN_SaveArrays(Name, ccs_unit, ccs_scope, ccs_measure_err);
}

function CCS_TempToDACCollect()
{
	if (!dev.r(46))
	{
		print("Temperature system was disabled. Exit.");
		return;
	}
	
	var flagCopy = dev.r(85);
	dev.w(85, 1);
	
	var counter = 0;
	for (var temp1 = ccs_t_min, temp2 = ccs_t_max; temp1 <= ccs_t_max && temp2 >= ccs_t_min; temp1 += ccs_t_stp, temp2 -= ccs_t_stp)
	{
		print("Writing val1: " + temp1);
		CCS_TempWrite(1, temp1 * 10);
		print("Writing val2: " + temp2);
		CCS_TempWrite(2, temp2 * 10);
		sleep(40000);
		if (counter == 0) sleep(40000);
		
		ccs_tempdac_set1[counter] = temp1;
		ccs_tempdac_set2[counter] = temp2;
		print("#1");
		ccs_tempdac_ch1[counter] = CS_CollectTempExtFunc(1);
		ccs_tempdac_err1[counter] = ccs_tempdac_ch1[counter] - ccs_tempdac_set1[counter];
		print("#2");
		ccs_tempdac_ch2[counter] = CS_CollectTempExtFunc(2);
		ccs_tempdac_err2[counter] = ccs_tempdac_ch2[counter] - ccs_tempdac_set2[counter];
		counter++;
		print("-------------------");
		
		if (anykey())
		{
			dev.w(85, flagCopy);
			return 0;
		}
	}
	
	// Restore flag
	dev.w(85, flagCopy);
	
	return 1;
}

function CCS_SaveTempToDAC(NameCH1, NameCH2)
{
	CGEN_SaveArrays(NameCH1, ccs_tempdac_ch1, ccs_tempdac_set1, ccs_tempdac_err1);
	CGEN_SaveArrays(NameCH2, ccs_tempdac_ch2, ccs_tempdac_set2, ccs_tempdac_err2);
}

function CCS_SaveTempRead1(NameCH1)
{
	CGEN_SaveArrays(NameCH1, cs_t_remote1, cs_t_remote_ext, ccs_tempread_err1);
}

function CCS_SaveTempRead2(NameCH2)
{
	CGEN_SaveArrays(NameCH2, cs_t_remote2, cs_t_remote_ext, ccs_tempread_err2);
}

function CCS_TempToDACCalibrate()
{
	// Reset correction
	CCS_TempToDACCal1(0, 1, 0);
	CCS_TempToDACCal2(0, 1, 0);
	
	// Reset arrays
	CCS_TempToDACResetA();
	
	// Collect data
	if (CCS_TempToDACCollect())
	{
		// Save data arrays
		CCS_SaveTempToDAC("cs_temp_to_dac1", "cs_temp_to_dac2");
		
		// Apply correction
		var ccs_temp_to_dac_corr;
		ccs_temp_to_dac_corr = CGEN_GetCorrection2("cs_temp_to_dac1");
		CCS_TempToDACCal1(ccs_temp_to_dac_corr[0], ccs_temp_to_dac_corr[1], ccs_temp_to_dac_corr[2]);
		//
		ccs_temp_to_dac_corr = CGEN_GetCorrection2("cs_temp_to_dac2");
		CCS_TempToDACCal2(ccs_temp_to_dac_corr[0], ccs_temp_to_dac_corr[1], ccs_temp_to_dac_corr[2]);
		
		// Print correction
		CCS_PrintTempToDACCal();
		
		scattern(ccs_tempdac_set1, ccs_tempdac_err1, "Temp 1 setpoint (in C)", "Error (in %)", "Temperature 1 measure relative error"); sleep(200);
		scattern(ccs_tempdac_set2, ccs_tempdac_err2, "Temp 2 setpoint (in C)", "Error (in %)", "Temperature 2 measure relative error");
	}
}

function CCS_TempToDACVerify()
{
	// Reset arrays
	CCS_TempToDACResetA();
	
	// Collect data
	if (CCS_TempToDACCollect())
	{
		// Save data arrays
		CCS_SaveTempToDAC("cs_temp_to_dac1_fixed", "cs_temp_to_dac2_fixed");
		
		scattern(ccs_tempdac_set1, ccs_tempdac_err1, "Temp 1 setpoint (in C)", "Error (in %)", "Temperature 1 measure relative error"); sleep(200);
		scattern(ccs_tempdac_set2, ccs_tempdac_err2, "Temp 2 setpoint (in C)", "Error (in %)", "Temperature 2 measure relative error");
	}
}

function CCS_PlotAndSaveFixedError(Name, InputArray, ReferenceArray, CorrectionArray, TRM_Addr)
{
	var err = [];
	var fixed = [];
	
	for (var i = 0; i < InputArray.length; i++)
	{
		var tmp = InputArray[i];
		tmp = tmp * tmp * CorrectionArray[0] + tmp * CorrectionArray[1] + parseFloat(CorrectionArray[2]);
		
		err[i] = (tmp - ReferenceArray[i]).toFixed(1);
		fixed[i] = parseFloat(tmp).toFixed(1);
	}
	
	CGEN_SaveArrays(Name, fixed, ReferenceArray, err);	
	scattern(ReferenceArray, err, "Temp (in C)", "Error (in %)", "Temperature TRM" + TRM_Addr + " predicted error");
}

function CCS_DACWrite(Channel, Value)
{
	dev.w(82, Channel);
	dev.w(83, Value);
	dev.c(111);
}

function CCS_TempWrite(Channel, Temp)
{
	dev.w(82, Channel);
	dev.w(83, Temp);
	dev.c(112);
}

function CCS_ClampCal(P2, P1, P0)
{
	dev.ws(12, Math.round(P2 * 1e6));
	dev.w(13, Math.round(P1 * 1000));
	dev.ws(14, Math.round(P0));
}

function CCS_TempReadCal1(P2, P1, P0)
{
	dev.ws(34, Math.round(P2 * 1e6));
	dev.w(35, Math.round(P1 * 1000));
	dev.ws(36, Math.round(P0 * 10));
}

function CCS_TempReadCal2(P2, P1, P0)
{
	dev.ws(37, Math.round(P2 * 1e6));
	dev.w(38, Math.round(P1 * 1000));
	dev.ws(39, Math.round(P0 * 10));
}

function CCS_TempToDACCal1(P2, P1, P0)
{
	dev.ws(40, Math.round(P2 * 1e6));
	dev.w(41, Math.round(P1 * 1000));
	dev.ws(42, Math.round(P0 * 10));
}

function CCS_TempToDACCal2(P2, P1, P0)
{
	dev.ws(43, Math.round(P2 * 1e6));
	dev.w(44, Math.round(P1 * 1000));
	dev.ws(45, Math.round(P0 * 10));
}

function CCS_PrintClampCal()
{
	print("Force P2 x1e6:	" + dev.rs(12));
	print("Force P1 x1000:	" + dev.r(13));
	print("Force P0:	" + dev.rs(14));
}

function CCS_PrintTempToDACCal()
{
	print("DAC1 P2 x1e6:	" + dev.rs(40));
	print("DAC1 P1 x1000:	" + dev.r(41));
	print("DAC1 P0:	" + (dev.rs(42) / 10));

	print("DAC2 P2 x1e6:	" + dev.rs(43));
	print("DAC2 P1 x1000:	" + dev.r(44));
	print("DAC2 P0:	" + (dev.rs(45) / 10));
}

function CCS_PrintTempReadCal1()
{
	print("Temp1 P2 x1e6:	" + dev.rs(34));
	print("Temp1 P1 x1000:	" + dev.r(35));
	print("Temp1 P0:	" + (dev.rs(36) / 10));
}

function CCS_PrintTempReadCal2()
{
	print("Temp2 P2 x1e6:	" + dev.rs(37));
	print("Temp2 P1 x1000:	" + dev.r(38));
	print("Temp2 P0:	" + (dev.rs(39) / 10));
}

function CCS_ClampResetA()
{
	ccs_inp = [];
	ccs_unit = [];
	ccs_scope = [];
	ccs_measure_err = [];
	ccs_setpoint_err = [];
}

function CCS_TempPlot()
{
	plot(cs_t_remote1, 10, 0);
	plot(cs_t_remote2, 10, 0);
}

function CCS_TempToDACResetA()
{
	// Reset arrays
	ccs_tempdac_set1 = [];
	ccs_tempdac_set2 = [];
	ccs_tempdac_ch1 = [];
	ccs_tempdac_ch2 = [];
	ccs_tempdac_err1 = [];
	ccs_tempdac_err2 = [];
}

function CCS_TempReadResetA()
{
	ccs_tempread_err1 = [];
	ccs_tempread_err2 = [];
	
	CS_ResetA();
}

function CCS_TempErrorPlot(filename, filename_ref)
{
	var temperror = [];
	var tempread = [];
	var tempref = [];
	
	tempread = load(filename);
	tempref = load(filename_ref);
	
	for(i=0;i<tempread.length;i++)
	{
		temperror[i] = (tempread[i] - tempref[i])/tempref[i] * 100;
	}
	
	plot(temperror,1,0);
}
