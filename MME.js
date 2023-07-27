include("TestATU.js")
include("TestBVT.js")
include("TestCS.js")
include("TestdVdt.js")
include("TestGTU_4.0.js")
include("TestLSLH.js")
include("TestQRRHP.js")
include("TestTOU.js")

// SL
mme_sl_current_ih = 100;
// CSCU
mme_cs_def_force = 5; 			// Усилие зажатия минимальная в кН
mme_cs_force = 25; 				// Усилие зажатия максимальная в кН
mme_cs_height = 27; 			// Высота прибора в мм
// BVT HP
mme_bvt_current = 20; 			// Ток отсечки в мА
mme_bvt_vdrm = 1500; 			// Задание амплитуды прямого напряжения в В
mme_bvt_vrrm = 1500; 			// Задание амплитуды обратного напряжения в В
// ATU HP
mme_atu_power = 2000; 			// Ударная мощность обратных потерь в Вт
mme_atu_precurrent = 150; 		// Задание амплитуды препульса в мА
// CROVU
mme_crovu_voltage = 3000; 		// Задание амплитуды напряжения в В
mme_crovu_dvdt = 500; 			// Задание скорости нарастания напряжения в В/мкс
// QRR
mme_qrr_current = 400;
mme_qrr_current_rate = 30;
mme_qrr_voltage = 1500;
mme_qrr_voltage_rate = 1000;
mme_qrr_mode = 1; 				// 0 - QRR, 1 - QRR Tq, 2 - only CROVU
// QRR CROVU
mme_qrr_crovu_voltage = 1500;
mme_qrr_crovu_voltage_rate = 1000;
// VGNT
mme_vgnt_voltage = 1000;		// Anode voltage (in V)
mme_vgnt_current = 5;			// Anode current (in mA)

mme_counter = 0;

// definitions for MME_Test()
mme_GTU   =	0;
mme_SL    =	1;
mme_BVTD  =	2;
mme_BVTR  =	3;
mme_CSDEF =	4;
mme_CSMAX =	5;
mme_CROVU = 6;
mme_ATU   =	7;
mme_QRR   =	8;
mme_GTUSL = 9;
mme_VGNT  = 10;
mme_QRR_CROVU = 11;
mme_TOU = 12;

// active blocks
mme_use_GTU = 	1;
mme_use_SL = 	1;
mme_use_BVT =	1;
mme_use_CS = 	0;
mme_use_CROVU = 0;
mme_use_ATU = 	0;
mme_use_QRR = 	0;
mme_use_TOU = 	1;

// Номера id блоков
mme_Nid_HMIU = 0;
mme_Nid_CU = 1;
mme_Nid_SL = 2; // может быть Nid = 9, смотреть в прошивку
mme_Nid_GTU = 3;
mme_Nid_BVT = 4;
mme_Nid_CUext = 5;
mme_Nid_CS = 6;
mme_Nid_CROVU = 7;
mme_Nid_SCTU = 8;
mme_Nid_ATU = 9;
mme_Nid_QRR = 10;
mme_Nid_TOU = 11;

//
mme_GTU_Result_Igt = 0;
mme_GTU_Result_Vgt = 0;
mme_GTU_Result_Ih  = 0;
mme_GTU_Result_Il  = 0;
mme_GTU_Result_Vgnt = 0;
mme_GTU_Result_Ignt = 0;
//
mme_SL_Result_Utm = 0;
//
mme_BVT_Result_Idrm = 0;
mme_BVT_Result_Irrm = 0;
//
mme_QRR_Result_Qrr = 0;
mme_QRR_Result_trr = 0;
mme_QRR_Result_Irr = 0;
mme_QRR_Result_tq = 0;
mme_QRR_Result_dVdt = 0;

mme_TOU_Result_Itm = 0;
mme_TOU_Result_tgd = 0;
mme_TOU_Result_tgt = 0;
// 

// settings
mme_plot = 0;	// Plot graphics

function MME_Units()
{
	var ret = 1;
	
	dev.nid(mme_Nid_HMIU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 0]  HMIU:	OK");
	}
	catch (e)
	{
		print("[Node 0]  HMIU:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_CU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 1]  CU:	OK");
	}
	catch (e)
	{
		print("[Node 1]  CU:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_SL);
	try
	{
		dev.Read16Silent(0);
		print("[Node 2]  SL:	OK");
	}
	catch (e)
	{
		print("[Node 2]  SL:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_GTU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 3]  GTU:	OK");
	}
	catch (e)
	{
		print("[Node 3]  GTU:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_BVT);
	try
	{
		dev.Read16Silent(0);
		print("[Node 4]  BVT:	OK");
	}
	catch (e)
	{
		print("[Node 4]  BVT:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_CUext);
	try
	{
		dev.Read16Silent(0);
		print("[Node 5]  CUext:	OK");
	}
	catch (e)
	{
		print("[Node 5]  CUext:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_CS);
	try
	{
		dev.Read16Silent(0);
		print("[Node 6]  CS:	OK");
	}
	catch (e)
	{
		print("[Node 6]  CS:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_CROVU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 7]  dVdt:	OK");
	}
	catch (e)
	{
		print("[Node 7]  dVdt:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_SCTU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 8]  SCTU:	OK");
	}
	catch (e)
	{
		print("[Node 8]  SCTU:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_ATU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 9]  ATU:	OK");
	}
	catch (e)
	{
		print("[Node 9]  ATU:	None");
		ret = 0;
	}
	
	dev.nid(mme_Nid_QRR);
	try
	{
		dev.Read16Silent(0);
		print("[Node 10] QRR:	OK");
	}
	catch (e)
	{
		print("[Node 10] QRR:	None");
		ret = 0;
	}

	dev.nid(mme_Nid_TOU);
	try
	{
		dev.Read16Silent(0);
		print("[Node 11] TOU:	OK");
	}
	catch (e)
	{
		print("[Node 11] TOU:	None");
		ret = 0;
	}
	
	return ret;
}

function MME_TestUnits(UnitArray, Num, Pause)
{
	var i, j;
	var Counter = 0, Fails = 0;
	var FailArray = [];
	
	for (i = 0; i < UnitArray.length; i++)
		FailArray[i] = 0;

	for (i = 0; i < Num; i++)
	{
		for (j = 0; j < UnitArray.length; j++)
		{
			print("# " + (Counter + 1));
			print("Fails sum:	" + Fails);
			print("Node check:	" + UnitArray[j]);
			
			dev.nid(UnitArray[j])
			try
			{
				dev.Read16Silent(0);
			}
			catch (e)
			{
				Fails++;
				FailArray[j]++;
			}
			
			print("------------------");
			
			Counter++;
			sleep(Pause);
			if (anykey()) return;
		}
	}
	
	print("Fails by nodes")
	for (i = 0; i < UnitArray.length; i++)
		print("Node " + UnitArray[i] + ":	" + FailArray[i]);
}

function MME_IsReady()
{
	// CU
	dev.nid(mme_Nid_CU);
	if (dev.r(96) == 0)
	{
		print("Starting CU...");
		dev.c(1);
	}
	if (dev.r(96) != 3 && dev.r(96) != 4)
	{
		print("CU not ready");
		PrintStatus();
		return 0;
	}
	
	// SL
	if (mme_use_SL)
	{
		dev.nid(mme_Nid_SL);
		if (dev.r(192) == 0)
		{
			print("Starting SL...");
			dev.c(1);
		}
		while (dev.r(192) == 3 || dev.r(192) == 5) sleep(500);
		if (dev.r(192) != 4)
		{
			print("SL not ready");
			PrintStatus();
			return 0;
		}
	}
	
	// BVT
	if (mme_use_BVT)
	{
		dev.nid(mme_Nid_BVT);
		if (dev.r(192) == 0)
		{
			print("Starting BVT...");
			dev.c(1);
		}
		if (dev.r(192) != 4)
		{
			print("BVT not ready");
			PrintStatus();
			return 0;
		}
	}
	
	// CS
	if (mme_use_CS)
	{
		dev.nid(mme_Nid_CS);
		if (dev.r(96) == 0)
		{
			print("Starting CS...");
			dev.c(100);
		}
		while (dev.r(96) == 5) sleep(500);
		if (dev.r(96) != 3)
		{
			print("CS not ready");
			PrintStatus();
			return 0;
		}
	}
	
	// QRR
	if (mme_use_QRR)
	{
		dev.nid(mme_Nid_QRR);
		if (dev.r(192) == 0)
		{
			print("Starting Qrr...");
			dev.c(1);
		}
		while (dev.r(192) == 3) sleep(500);
		if (dev.r(192) != 4)
		{
			print("QRR not ready");
			PrintStatus();
			return 0;
		}
	}
	
	// dVdt
	if (mme_use_CROVU)
	{
		dev.nid(mme_Nid_CROVU);
		if (dev.r(192) == 0)
		{
			print("Starting CROVU...");
			dev.c(1);
		}
		if (dev.r(192) != 3)
		{
			print("CROVU not ready");
			PrintStatus();
			return 0;
		}
	}
	
	// ATU
	if (mme_use_ATU)
	{
		dev.nid(mme_Nid_ATU);
		if (dev.r(96) == 0)
		{
			print("Starting ATU...");
			dev.c(1);
		}
		if (dev.r(96) != 4)
		{
			print("ATU not ready");
			PrintStatus();
			return 0;
		}
	}

	// TOU
	if (mme_use_TOU)
	{
		dev.nid(mme_Nid_TOU);
		if (dev.r(192) == 0)
		{
			print("Starting TOU...");
			dev.c(1);
		}
		while (dev.r(192) == 3 || dev.r(192) == 5) sleep(500);
		if (dev.r(192) != 4)
		{
			print("TOU not ready");
			PrintStatus();
			return 0;
		}
	}
	
	return 1;
}
	
function MME_CS(Force)
{
	if (mme_use_CS)
	{
		dev.nid(mme_Nid_CS);
		if (Force == 0)
		{
			dev.c(104);
			while (dev.r(96) != 3) sleep(500);
		}
		else if (Force == Math.ceil((dev.r(110) / 10)))
		{
			print("Already reached this force, kN: " + (dev.r(110) / 10));
		}
		else
		{
			dev.w(70, Force * 10);
			dev.w(71, mme_cs_height);
			if (dev.r(96) == 3)
			{
				dev.c(102);
			}
			else if (dev.r(96) == 8)
			{
				dev.c(103);
			}
			while (dev.r(96) != 8) sleep(500);
			print("Force,kN: " + (dev.r(110) / 10));
		}
	}
}

function MME_CU(CMD)
{
	dev.nid(mme_Nid_CU);
	dev.c(CMD);
}

function MME_GTU()
{
	if (mme_use_GTU)
	{
		gtu_plot = mme_plot;
		dev.nid(mme_Nid_GTU);
		GTU_All(1, 0);
	}
}

function MME_GTUSL(Current)
{
	// activate gtu
	dev.nid(mme_Nid_GTU);
	dev.w(130, 1);
	dev.w(151, 4)
	dev.c(102);
	
	// activate sl
	dev.nid(mme_Nid_SL);
	dev.w(163, 1);
	LSLH_StartMeasure(Current);
	if (mme_plot) pl(dev.rafs(1));
	
	// read gtu
	dev.nid(mme_Nid_GTU);
	while(dev.r(192) == 5) sleep(500);
	if (dev.r(197) == 2) print("problem: " + dev.r(196));
	print("Ih,   mA: " + dev.r(201));
	
	// recommutate
	MME_CU(111);
	print("CU ok");
	
	// measure in ordinary way
	dev.nid(mme_Nid_GTU);
	dev.w(130, 0);
	gtu_plot = mme_plot;
	GTU_Holding();
}

function MME_SL(Current)
{
	if (mme_use_SL)
	{
		dev.nid(mme_Nid_SL);
		LSLH_StartMeasure(Current);
		if (mme_plot) pl(dev.rafs(1));
	}
}

function MME_BVT(Voltage)
{
	if (mme_use_BVT)
	{
		dev.nid(mme_Nid_BVT);
		BVT_StartPulse(1, Voltage, mme_bvt_current * 10);
		if (mme_plot) BVT_PlotXY();
	}
}

function MME_ATU()
{
	if (mme_use_ATU)
	{
		dev.nid(mme_Nid_ATU);
		ATU_StartPower(mme_atu_precurrent, mme_atu_power);
		if (mme_plot) ATU_Plot();
	}
}

function MME_CROVU()
{
	if (mme_use_CROVU)
	{
		dev.nid(mme_Nid_CROVU);
		dev.w(128, mme_crovu_voltage);
		dev.w(129, mme_crovu_dvdt);
		dev.c(10);
		dev.c(100);
		while (_dVdt_Active()) sleep(500);
		if (mme_plot) if(dev.r(198) == 1)
			print("Прибор остался закрытым");
		else if(dev.r(198) == 0)
			print("Прибор открылся");
		dVdt_PrintInfo();
		print("---------------------");
	}
}

function MME_QRR()
{
	if (mme_use_QRR)
	{
		dev.nid(mme_Nid_QRR);
		QRR_Start(mme_qrr_mode, mme_qrr_current, mme_qrr_current_rate, mme_qrr_voltage, mme_qrr_voltage_rate);
	}
}

function MME_QRR_CROVU()
{
	if (mme_use_QRR)
	{
		dev.nid(mme_Nid_QRR);
		QRR_Start(2, mme_qrr_current, mme_qrr_current_rate, mme_qrr_crovu_voltage, mme_qrr_crovu_voltage_rate);
	}
}

function MME_VGNT()
{
	if (mme_use_GTU && mme_use_BVT)
	{
		GTU_Vgnt(mme_vgnt_voltage, mme_vgnt_current);
	}
}

function MME_TOU()
{
	if (mme_use_TOU)
	{
		dev.nid(mme_Nid_TOU);
		TOU_Measure(160);
		sleep(4000);
		TOU_Measure(600);
		sleep(4000);
		TOU_Measure(1250);
		sleep(4000);
	}
}

function MME_ResetA()
{
	GTU_ResetA();
	SL_ResetA();
	BVT_ResetA();
}

function MME_Test(UnitArray, Counter, Pause, SLCurrent)
{	
	if (!MME_IsReady())
	{
		print("System not ready, exit");
		print("-------------");
		return;
	}
	else
	{
		print("System is ready");
		print("-------------");
	}
	
	for (var i = 0; i < Counter; i++)
	{
		for (var j = 0; j < UnitArray.length; j++)
		{
			switch (UnitArray[j])
			{
				case mme_GTU:
					print("#GTU");
					MME_CS(mme_cs_def_force);
					MME_CU(111);
					MME_GTU();
					MME_CU(110);
					MME_Collect(mme_GTU);
					break;
				case mme_SL:
					print("#SL");
					MME_CS(mme_cs_force);
					MME_CU(112);
					MME_SL(SLCurrent);
					MME_CU(110);
					MME_Collect(mme_SL);
					break;
				case mme_BVTD:
					print("#BVTD");
					bvt_direct = 1;
					MME_CS(mme_cs_def_force);
					MME_CU(113);
					MME_BVT(mme_bvt_vdrm);
					MME_CU(110);
					MME_Collect(mme_BVTD);
					break;
				case mme_BVTR:
					print("#BVTR");
					bvt_direct = 0;
					MME_CS(mme_cs_def_force);
					MME_CU(114);
					MME_BVT(mme_bvt_vrrm);
					MME_CU(110);
					MME_Collect(mme_BVTR);
					break;
				case mme_CSDEF:
					print("#CSDEF");
					MME_CS(mme_cs_def_force);
					sleep(2000);
					print("-------------");
					break;
				case mme_CSMAX:
					print("#CS");
					MME_CS(mme_cs_force);
					sleep(2000);
					print("-------------");
					break;
				case mme_ATU:
					print("#ATU");
					MME_CS(mme_cs_force);
					MME_CU(115);
					MME_ATU();
					MME_CU(110);
					break;
				case mme_CROVU:
					print("#CROVU");
					MME_CS(mme_cs_force);
					MME_CU(115);
					MME_CROVU();
					MME_CU(110);
					break;
				case mme_QRR:
					print("#QRR");
					MME_CS(mme_cs_force);
					MME_CU(115);
					MME_QRR();
					MME_CU(110);
					MME_Collect(mme_QRR);
					break;
				case mme_QRR_CROVU:
					print("#QRR CROVU");
					MME_CS(mme_cs_force);
					MME_CU(115);
					MME_QRR_CROVU();
					MME_CU(110);
					MME_Collect(mme_QRR_CROVU);
					break;
				case mme_GTUSL:
					print("#MME_GTUSL - IH GOST");
					MME_CU(116);
					MME_CS(mme_cs_force);
					MME_GTUSL(mme_sl_current_ih);
					MME_CU(110);
					break;
				case mme_VGNT:
					print("#VGNT");
					MME_CU(117);
					MME_CS(mme_cs_force);
					GTU_Vgnt(mme_vgnt_voltage, mme_vgnt_current);
					MME_Collect(mme_VGNT);
					MME_CU(110);
					break;
				case mme_TOU:
					print("#TOU");
					MME_CS(mme_cs_force);
					MME_CU(115);
					MME_TOU();
					MME_CU(110);
					MME_Collect(mme_TOU);
					break;
			}
		}
		
		MME_CU(110);
		MME_CS(0);
		
		// get time
		print(new Date());
		
		// get temperature
		if (mme_use_CS)
		{
			print("Temp1, C: " + (dev.r(101) / 10));
			print("Temp2, C: " + (dev.r(102) / 10));
		}
		
		MME_PrintSummaryResult(UnitArray);
	
		print("Global counter: " + (++mme_counter));
		print("-------------");
		
		if (Counter > 1) sleep(Pause);
		if (anykey()) return 0;
	}
	
	return 1;
}

function MME_SafetyPos(Num, Pos)
{
	for (var i = 0; i < Num; i++)
	{
		dev.nid(mme_Nid_CU);
		dev.c(100);
		dev.c(112);

		dev.nid(mme_Nid_CS);
		if (!CS_Pos(3, Pos))
		{
			dev.nid(mme_Nid_CU);
			sleep(2000);
			dev.c(101);
			
			dev.nid(mme_Nid_CS);
			dev.w(64, 0);
			sleep(5000);
		}
		
		if (anykey()) return;
	}
}

function MME_SafetyClamp(Num, Force)
{
	for (var i = 0; i < Num; i++)
	{
		dev.nid(mme_Nid_CU);
		dev.c(100);
		dev.c(112);

		dev.nid(mme_Nid_CS);
		if (!CS_Clamp(3, Force))
		{
			dev.nid(mme_Nid_CU);
			sleep(2000);
			dev.c(101);
			
			dev.nid(mme_Nid_CS);
			dev.c(104);
			sleep(5000);
		}
		
		if (anykey()) return;
	}
}

function MME_Collect(Unit)
{
	switch(Unit)
	{
		case mme_GTU:
			dev.nid(mme_Nid_GTU);
			mme_GTU_Result_Igt = gtu_igt[gtu_igt.length - 1];
			mme_GTU_Result_Vgt = gtu_vgt[gtu_vgt.length - 1];
			mme_GTU_Result_Ih  = gtu_ih[gtu_ih.length - 1];
			mme_GTU_Result_Il  = gtu_il[gtu_il.length - 1];
			break;
			
		case mme_SL:
			dev.nid(mme_Nid_SL);
			mme_SL_Result_Utm = dev.r(198);
			break;
		
		case mme_BVTD:
			dev.nid(mme_Nid_BVT);
			mme_BVT_Result_Idrm = BVT_ReadCurrent(bvt_use_microamps);
			break;
			
		case mme_BVTR:
			dev.nid(mme_Nid_BVT);
			mme_BVT_Result_Irrm = BVT_ReadCurrent(bvt_use_microamps);
			break;
			
		case mme_VGNT:
			dev.nid(mme_Nid_GTU);
			mme_GTU_Result_Vgnt = dev.r(205);
			mme_GTU_Result_Ignt = dev.r(206);
			break;
		
		case mme_QRR:
			dev.nid(mme_Nid_QRR);
			mme_QRR_Result_Qrr = dev.r(216) / 10;
			mme_QRR_Result_Irr = dev.r(211);
			mme_QRR_Result_trr = dev.r(212) / 10;
			mme_QRR_Result_tq = dev.r(213) / 10;
			break;
			
		case mme_QRR_CROVU:
			dev.nid(mme_Nid_QRR);
			mme_QRR_Result_dVdt = dev.r(198);
			break;

		case mme_TOU:
			dev.nid(mme_Nid_TOU);
			mme_TOU_Result_Itm = dev.r(250);
			mme_TOU_Result_tgd = dev.r(251) / 1000;
			mme_TOU_Result_tgt = dev.r(252) / 1000;
			break;
	}
}

function MME_PrintSummaryResult(UnitArray)
{
	var MeasurementTypes = [];
	var MeasurementValues = [];
	
	print("");
	print("Summary result:");
	
	var out_str = "";
	
	for(i = 0; i < UnitArray.length; i++)
	{
		switch(UnitArray[i])
		{
			case mme_GTU:
				print("Vgt	= " + mme_GTU_Result_Vgt);
				print("Igt	= " + mme_GTU_Result_Igt);
				print("Ih	= " + mme_GTU_Result_Ih);
				print("IL	= " + mme_GTU_Result_Il);
				out_str += mme_GTU_Result_Vgt + ";" + mme_GTU_Result_Igt + ";" +
					mme_GTU_Result_Ih + ";" + mme_GTU_Result_Il + ";";
				break;
			
			case mme_SL:
				print("Utm	= " + mme_SL_Result_Utm);
				out_str += mme_SL_Result_Utm + ";";
				break;
				
			case mme_BVTD:
				print("Idrm	= " + mme_BVT_Result_Idrm);
				out_str += mme_BVT_Result_Idrm + ";";
				break;
				
			case mme_BVTR:
				print("Irrm	= " + mme_BVT_Result_Irrm);
				out_str += mme_BVT_Result_Irrm + ";";
				break;
				
			case mme_VGNT:
				print("Vgnt	= " + mme_GTU_Result_Vgnt);
				print("Ignt	= " + mme_GTU_Result_Ignt);
				out_str += mme_GTU_Result_Vgnt + ";" + mme_GTU_Result_Ignt + ";";
				break;
				
			case mme_QRR:
				print("Tq	= " + mme_QRR_Result_tq);
				print("Qrr	= " + mme_QRR_Result_Qrr);
				print("trr	= " + mme_QRR_Result_trr);
				print("IrrM	= " + mme_QRR_Result_Irr);
				out_str += mme_QRR_Result_tq.toFixed(3) + ";" + mme_QRR_Result_Qrr.toFixed(3) + ";" +
					mme_QRR_Result_trr.toFixed(3) + ";" + mme_QRR_Result_Irr + ";";
				break;
				
			case mme_QRR_CROVU:
				if(mme_QRR_Result_dVdt == 1)
				{
					print("dVdt	= OK");
					out_str += "OK;";
				}
				if(mme_QRR_Result_dVdt == 2)
				{
					print("dVdt	= Fail");
					out_str += "FAIL;";
				}
				break;
			case mme_TOU:
				print("Itm	= " + mme_TOU_Result_Itm);
				print("tgd	= " + mme_TOU_Result_tgd);
				print("tgt	= " + mme_TOU_Result_tgt);
				break;
		}
	}
	print("\n" + out_str + "\n");
}
