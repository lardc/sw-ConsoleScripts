include("Tektronix.js")
include("DMM6500.js")

function InitMeasurementInstrument(COMports)
{
	for (var i = 0; COMports.length; ++i)
	{
		TEK_PortInit(COMports[i]);
		var result = TEK_Exec("ID?");
		if (result.includes("Tektronix"))
			return i;
	}
}
