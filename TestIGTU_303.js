include("PrintStatus.js")


function IGTU_Res()
{
	if(dev.r(192) == 3)
	{
		dev.c(103);
		sleep(dev.r(90));
	}	
	while (dev.r(192) != 3) sleep(50);
		
	if(dev.r(196) != 0)
	{
		PrintStatus();
		return;
	}

	p('R, Ohm: ' + dev.rf(205).toFixed(3));
	p("V, V:" + dev.rf(232).toFixed(6));
	p("I, mA:" + dev.rf(230).toFixed(6));

}
//--------------------

function IGTU_Iges(Voltage)
{
	dev.wf(136, Voltage);
	
	if(dev.r(192) == 3)
	{
		dev.c(102);
		
		p("Start process...")
		
		sleep(dev.r(86));
		
		while(dev.r(192) != 3)
		{
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return;
			}
		}
		
		if(dev.r(196) != 0)
			PrintStatus();
		
		p("Iges, A:" + dev.rf(204).toFixed(12));
	}
	else
		PrintStatus();
}
//--------------------

function IGTU_Vgs(Current)
{
	dev.wf(128, Current);
	
	if(dev.r(192) == 3)
	{
		dev.c(100);
			
		while (dev.r(192) != 3) sleep(50);
		
		if(dev.r(196) != 0)
		{
			PrintStatus();
			return;
		}
		
		p("Vges, V:" + dev.rf(200).toFixed(6));
		p("V, V:" + dev.rf(232).toFixed(6));
		p("I, mA:" + dev.rf(230).toFixed(6));
	}
}
//--------------------

function IGTU_SaveCSV_EP()
{
	var Suffix = GetDateTimeSuffix();

	save("data/IGTU_EP1_RegulatorIg_" + Suffix + ".csv", dev.raff(1));
	save("data/IGTU_EP2_RegulatorUg_" + Suffix + ".csv", dev.raff(2));
	save("data/IGTU_EP3_RegulatorUpot_" + Suffix + ".csv", dev.raff(3));
	save("data/IGTU_EP4_RegulatorSetpoint_" + Suffix + ".csv", dev.raff(4));
	save("data/IGTU_EP5_RegulatorCorrection_" + Suffix + ".csv", dev.raff(5));
	save("data/IGTU_EP6_RegulatorError_" + Suffix + ".csv", dev.raff(6));
	save("data/IGTU_EP7_DACRaw_" + Suffix + ".csv", dev.raff(7));
	save("data/IGTU_EP20_ExtInfoData_" + Suffix + ".csv", dev.raff(20));
}

function GetDateTimeSuffix()
{
	var now = new Date();

	var day = FormatTwoDigits(now.getDate());
	var month = FormatTwoDigits(now.getMonth() + 1);
	var year = now.getFullYear();

	var hours = FormatTwoDigits(now.getHours());
	var minutes = FormatTwoDigits(now.getMinutes());
	var seconds = FormatTwoDigits(now.getSeconds());

	return day + "." + month + "." + year + "_" + hours + "-" + minutes + "-" + seconds;
}

function FormatTwoDigits(value)
{
	return (value < 10 ? "0" : "") + value;
}
